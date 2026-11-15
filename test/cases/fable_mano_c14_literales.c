#include <stdio.h>
int main() { printf("%d %d %d %d\n", 010, 0x10, 0b101, '0'); printf("%ld %u %lu\n", 2147483648, 4294967295u, 5000000000ul); printf("%d %d %d %d\n", 'a', '\n', '\0', '\\'); printf("%f %f %f\n", 1e3, .5, 5.); printf("%d %d %d\n", (int) sizeof(1), (int) sizeof(1L), (int) sizeof(1.0f)); printf("%d %d\n", (int) sizeof('a'), (int) sizeof(2147483648)); return 0; }
