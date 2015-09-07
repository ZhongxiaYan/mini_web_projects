use strict;
use Data::Dumper;

my @paired_tags_array = ("html", "head", "body", "script", "div", "a", "p", "style", "ul", "li");
my @unpaired_tags_array = ("img", "link");

my %paired_tags = ();
my %unpaired_tags = ();
foreach my $tag (@paired_tags_array) {
    $paired_tags{$tag} = 1;
    $unpaired_tags{$tag} = 1;
}

my @target_files = ();
my %structure = ();
if (open my $cfh, "common.html") {
    my $targets = <$cfh>;
    chomp $targets;
    push @target_files, split(",", $targets);
    while (<$cfh>) {
        chomp;
        if (m/^<html>/) {
            read_tag($cfh, $_, \%structure);
        }
    }
    close $cfh;
} else {
    die "Cannot open common.html\n";
}
print "Target files: ".join(", ", @target_files)."\n";

foreach my $target_file (@target_files) {
    if (open my $fh, $target_file) {
        if (open my $wh, ">", "../$target_file") {
            while (<$fh>) {
                chomp;
                if (m/^<html>/) {
                    scan_tag($fh, $wh, $_, \%structure);
                }
            }
        } else {
            die "Cannot open ../$target_file for write\n";
        }
    } else {
        die "Cannot open $target_file\n";
    }
}

sub scan_tag {
    my $fh = shift;
    my $wh = shift;
    my $tag = shift;
    my $tag_content = shift;
    my %content = ();
    
    print $wh "$_\n";
    my $content_ref = $$tag_content{$tag};
    if (defined $content_ref) {
        %content = %{$content_ref};
        if (defined $content{"print"}) {
            my @print_array = @{$content{"print"}};
            foreach my $line (@print_array) {
                print $wh "$line\n";
            }
        }
    }
    while (<$fh>) {
        chomp;
        if (m/^\s*<\//) {
            print $wh "$_\n";
            last;
        }
        if (m/^\s*</) {
            scan_tag($fh, $wh, $_, \%content);
            next;
        }
        
        print $wh "$_\n";
    }
}

sub read_tag {
    my $fh = shift;
    my $tag = shift;
    my $parent_reference = shift;
    my %tag_content = ();
    my @print_array = ();
    while (<$fh>) {
        chomp;
        if (m/^{\s*$/) {
            while (<$fh>) {
                chomp;
                last if (m/^}\s*/);
                push @print_array, $_;
            }
            next;
        }
        if (m/^\s*<\//) {
            last;
        }
        if (m/^\s*</) {
            read_tag($fh, $_, \%tag_content);
            next;
        }
        
    }
    if (scalar @print_array) {
        $tag_content{"print"} = \@print_array;
    }
    $$parent_reference{$tag} = \%tag_content;
}